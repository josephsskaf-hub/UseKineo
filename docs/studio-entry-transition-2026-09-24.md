# Studio entry transition — 2026-09-24

FATO CONFIRMADO: `app/KineoLanding.tsx` sent the signed-in toolkit CTA to
`/studio/create?src=engine_bento`. `GenerateClient.tsx` rendered its idle legacy
form before a client effect replaced this attribution-only URL with `/studio`.
EVIDÊNCIA DE PRODUÇÃO (2026-09-24): browser inspection confirmed the CTA href
and the eventual `/studio` destination. This explains the reported transition;
the brief intermediate frame was established from the render/effect ordering.

IMPLEMENTADO: the home CTA and examples editor CTA open `/studio` directly.
Legacy empty/attribution-only entries display a neutral loading state while
recovery resolves and navigation completes. The shared breadcrumb remains
Studio. Attribution query parameters survive the redirect.

IMPLEMENTADO: pending prompts are read before their storage consumer removes
the key. Explicit creation, avatar, activation and recovery links stay in the
creation route. Restored jobs, non-idle phases, error, paywall and recovery
blocking UI are not hidden or redirected by this guard. No provider request,
credit settlement, account activation or render algorithm was changed.

TESTADO LOCALMENTE: TypeScript passed; all 20 existing Guardião critical scripts
passed; 53 new offline regression checks cover entry/recovery state and the
actual rendered home href. The new regression is included in Guardião.
The optional legacy `test-sem-porteiro-2026-09-02.mjs` still reports two unrelated
stale assertions: AvatarLaunchBanner now correctly targets `/avatar`, and its
text scanner mistakes legacy-path matching in workspaceFocus/workspaceNavigation
for outgoing links. Those production files were not changed in this fix.

Visual comparison: standalone `STUDIO-ENTRADA-ANTES-DEPOIS.html` in the existing
task output folder; it illustrates navigation states, not captured screenshots.
