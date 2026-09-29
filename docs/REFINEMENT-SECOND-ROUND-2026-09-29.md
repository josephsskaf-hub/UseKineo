# Refinement — second approved round, 29 September 2026

**IMPLEMENTADO / FATO CONFIRMADO — 2026-09-29.** Baseline: `495c2821`. Founder approved the ten proposals in this chat. Implementation stays in the isolated visual worktree. Billing, generation requests, owner queries and approved home media order are preserved.

1. **IMPLEMENTADO.** Images uses the latest result in the signed-in user's existing gallery for each engine, with a full-image dialog. No customer images become public. Engines without a result explicitly show no sample. `app/(dashboard)/images/ImagesClient.tsx` (image-engine-picker).
2. **IMPLEMENTADO.** Each image engine shows its existing purpose description, cost from `IMG_ENGINES` and reference together. No additional price table. Same component.
3. **IMPLEMENTADO.** Ads shows a larger vertical framing preview, synchronized to each existing focal position, with photo selection. It is labeled as the photo before animation, not a simulated final render. `app/(dashboard)/ads/v2/AdsV2Client.tsx` (adv2-live-preview).
4. **IMPLEMENTADO.** Examples supports themes intersected with search/engine. Only themes represented by the existing approved catalogue appear. No restaurant/product videos invented to populate filters. `lib/ui/examplesGallery.ts`, `app/examples/ExamplesGallery.tsx`.
5. **IMPLEMENTADO.** Image edit/upscale controls and example engine filters are disclosures. Existing Studio optional settings remain collapsed. No generation settings removed.
6. **IMPLEMENTADO.** Personal Library: browser-local favorites, newest/oldest/name order; actual video collection also has aspect-ratio filters from known platform metadata. Favorites store opaque IDs, intersect the currently authorized collection and tolerate unavailable storage. Not cross-device sync. `components/LibraryOrganization.tsx` and both LibraryClient/HistoryClient.
7. **IMPLEMENTADO.** Shared line icons replace decorative emoji in image actions, library search/download/animate and example search/play controls. `components/ControlIcon.tsx`.
8. **IMPLEMENTADO.** Larger themed player with native accessible controls, contain framing, mobile dimensions and larger close control; full-image preview with native dialog/Escape/focus restoration. Existing history playback remains unchanged.
9. **IMPLEMENTADO.** Mobile Studio/Images shortcut shows current engine/cost and scrolls to the existing review. Hidden while editing fields or when review is visible; above bottom navigation. It never invokes generation or bypasses the original confirmation. `components/MobileCreationShortcut.tsx`.
10. **IMPLEMENTADO.** Removed hidden full-video prefetch in rotating hero; visible clips retain their viewport/reduced-motion/data-saver policy. WallMedia now pauses on hidden tabs and preference changes. Images load lazily. Original 1080p source URLs unchanged.

**TESTADO LOCALMENTE — 2026-09-29.** Offline behavioral suite covers sorting without mutating input, account-collection intersection, favorites add/remove/storage recovery, theme filters, actual image references, no-image fallback and new-copy coverage in 16 languages. Existing library action-handler/query guard retained, excluding only explicitly approved filter handlers.

**EVIDÊNCIA VISUAL — 2026-09-29.** Self-contained comparison: `C:/Users/josep/Documents/Codex/2026-09-21/kineo-ux-ui/outputs/refinement-2-20260929/antes-depois.html`. Real component SSR; sample assets and balances are explicitly demonstrative, no paid generation. Desktop/mobile and light/dark controls included.

**QUESTÃO PENDENTE / DESCONHECIDO.** A verified public sample collection covering every image engine was not present in the repository. This implementation uses the person's real private outputs instead; it neither attributes concept art to those engines nor spends credits to create an unapproved public collection.
