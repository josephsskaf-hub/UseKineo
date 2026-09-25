# Kineo — mixed identity, second visual refinement

DECISÃO DO USUÁRIO — 24/09/2026, this task: keep the mixed direction and simplify
navigation to **Home / Create / For Ads**. Create contains the existing creative
studios. For Ads separates Studio Ads self-service from human-operated production.
The user supplied the existing blue/graphite Business screenshot as a favorite
palette and asked for a more refined, trustworthy storefront before purchase.

IMPLEMENTADO — review-only static proposal in
`public/design/mixed-refined-20260924/index.html`; production application routes
remain unchanged. Home/Create/Examples are light; For Ads and workspaces use the
deep blue/graphite signature from the supplied reference. New proposal defaults
to this mixed identity; no competing palette selection is required.

SUGESTÃO — a more intentional visual hierarchy: larger supporting type, compact
headline/CTA composition, the approved four-card home structure, two clear
creation paths and stronger separation of service vs software. Sidebar glyphs
are replaced by a consistent line icon set. The review toolbar is separate from
the product navigation and has a compact page selector.

FATO CONFIRMADO — generator `scripts/preview-kineo-mixed-refined.cjs` imports
product facts from `scripts/preview-neutral-kineo-20260924.cjs`, which reads the
pure `lib/growth/dfyServiceFacts.ts`, `lib/ads/offer.ts` and `lib/ads/models.ts`.
No price, credits, revisions or delivery promise has been changed. Demo buttons
do not purchase, upload, generate or access account files.

FATO CONFIRMADO — robot and Lituya use existing public clean 1080p previews.
Visible films play muted, with a pause control, lazy loading, hidden-tab pause
and reduced-motion preference respected. Product and restaurant images remain
explicitly identified as AI visual concepts, not completed client ad campaigns.

IMPLEMENTADO — the comparator includes the original Home/Business snapshots
and the preceding neutral proposal for all previously designed screens. The
new Create hub has no invented before state. Both desktop and phone views are
available. Original neutral proposal remains available at its previous URL.

SUGESTÃO — reference observations, not evidence of conversion lift:
Runway emphasizes the work, Synthesia keeps explanation and action legible,
and Creatify foregrounds the advertising task. The decision to use these
patterns is design judgment, not a claim of a universally preferred color.

References reviewed: https://runway.com/ · https://www.synthesia.io/ ·
https://creatify.ai/ (24/09/2026).

TESTADO LOCALMENTE — TypeScript and offline repository contract checks are run
for delivery; browser verification covers navigation, comparisons, real video
playback, model selection, library filters, mobile and desktop composition.
Only a confirmed test result is reported to the founder.

Offline rebuild: `node scripts/preview-kineo-mixed-refined.cjs`.
