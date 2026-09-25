import gallery from './examples/ExamplesGallery.module.css'

/** The approved v6 palette and composition, applied to the live home.
 * Media, engine availability, prices and checkout remain owned by their existing components.
 */
export const KINEO_LANDING_THEME_CSS = `
.klp {
  --bg:#f6f5f2; --s0:#e7e6e2; --card:#fff; --card2:#efeeeb; --s3:#e7edf2;
  --line:#cbcdd0; --line2:#a9afb6; --line3:#818b96;
  --txt:#20252b; --txt2:#35404b; --muted:#56616d; --muted2:#5e6873;
  --blue:#29343f; --blue-soft:#e7edf2; --home-action:#29343f; --home-on-action:#fff;
  --home-nav:#20252b; --home-wash:#efeeeb;
  --sh-card:0 8px 30px #18385908; --sh-card-h:0 12px 36px #18385912;
  --sh-cta:0 5px 18px #1766d31c;
  color-scheme:light;
  background:radial-gradient(ellipse 1100px 650px at 0 0,var(--home-wash),transparent 72%),var(--bg);
  overflow-x:clip;
}
html[data-theme=dark] .klp {
  --bg:#0c1521; --s0:#101d2b; --card:#121f2e; --card2:#192b3f; --s3:#1b3754;
  --line:#2d425a; --line2:#3b536e; --line3:#54718e;
  --txt:#eef5fe; --txt2:#c4d4e7; --muted:#a8bad0; --muted2:#97adc6;
  --blue:#91c9ff; --blue-soft:#1b3754; --home-action:#2997ff; --home-on-action:#071a2c;
  --home-nav:rgba(12,21,33,.94); --home-wash:#17324f;
  --sh-card:0 8px 30px #02081216; --sh-card-h:0 12px 36px #02081230;
  --sh-cta:0 5px 18px #02081220;
  color-scheme:dark;
}
.klp .wrap,.klp .ew-wrap { width:100%; max-width:1800px; padding-inline:clamp(24px,4vw,76px); }
.klp nav { background:var(--home-nav); border-color:var(--line); }
.klp .nav-in { height:88px; display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:28px; }
.klp .logo { font-size:26px; gap:10px; width:max-content; letter-spacing:-1px; }
.klp .logo .mk { width:29px; height:34px; color:#2997ff; }
.klp .nav-links { justify-self:center; gap:30px; font-size:14px; }
.klp .nav-links>.nd>a,.klp .nav-links>a { display:inline-flex; align-items:center; min-height:48px; padding:10px 0; white-space:nowrap; }
.klp .nav-links .nav-primary { color:var(--txt); font-weight:650; }
.klp .nav-links .nav-primary::after { content:''; position:absolute; inset:auto 0 4px; height:2px; border-radius:2px; background:var(--home-action); }
.klp .nav-right { justify-self:end; gap:12px; min-width:0; }
.klp .nav-right .kineo-interface-language { color:var(--txt)!important; background:var(--card)!important; border-color:var(--line)!important; color-scheme:inherit!important; border-radius:8px!important; }
.klp .nav-right .btn-w { border-radius:9px; }
.klp .nav-appearance { flex-shrink:0; }
/* Center navigation in the free space between brand and account controls. */
html:not([data-theme=dark]) .klp nav { color:#f8fafc; }
html:not([data-theme=dark]) .klp nav .logo,
html:not([data-theme=dark]) .klp .nav-links .nav-primary,
html:not([data-theme=dark]) .klp .nav-links>a:hover,
html:not([data-theme=dark]) .klp .nav-links>.nd>a:hover { color:#f8fafc; }
html:not([data-theme=dark]) .klp .nav-links { color:#cbd0d6; }
html:not([data-theme=dark]) .klp .nav-links .nav-primary::after { background:#66b2ff; }
html:not([data-theme=dark]) .klp .nav-right .btn-w { background:#f8fafc; color:#20252b; border-color:#f8fafc; }
html:not([data-theme=dark]) .klp .nav-appearance { background:#29343f; color:#f8fafc; border-color:#56616d; }
html:not([data-theme=dark]) .klp .nav-login { color:#e3e7ec; }
html:not([data-theme=dark]) .klp .nav-toggle-btn .bar { background:#f8fafc; }
.klp .nd-menu { color:var(--txt); }
.klp .nd-menu::before { background:var(--card); border-color:var(--line); box-shadow:0 16px 44px #071b3026; }
.klp .nd-menu { padding-top:9px; }
.klp .nd-menu::before { top:9px; }
.klp .nd-mega { left:50%; transform:translate(-50%,10px); }
.klp .nd:hover .nd-mega,.klp .nd:focus-within .nd-mega { transform:translate(-50%,0); }
.klp .nd-mega .nm-col { min-width:218px; padding:12px 7px; }
.klp .nd-mega .nm-more { min-width:156px; }
.klp .nd-mega .nm-col a { white-space:normal; border-radius:8px; min-height:48px; }
.klp .nd-mega .nm-col a i { white-space:normal; line-height:1.5; max-width:196px; }
.klp .nd-mega .nm-h { color:var(--muted); font-size:10px; }
.klp .nd-menu a:hover,.klp .nd-mega .nm-more a:hover { color:var(--txt); background:var(--card2); }
.klp .nm-ic { color:var(--blue); background:var(--blue-soft); border-color:var(--line); }
.klp .nm-chip { color:var(--blue); background:var(--blue-soft); }
.klp .nd-mega .nvp { border-color:var(--line2); }
.klp .nd-images { min-width:550px; display:grid; grid-template-columns:1fr 1fr; padding:20px 10px 12px; gap:4px; }
.klp .nd-images>a { margin:0; display:flex; gap:12px; align-items:center; min-height:75px; padding:12px; }
.klp .nd-images>a:first-child,.klp .nd-images>a:last-child { margin:0; }
.klp .nd-images .nm-tx b { font-size:13px; }
.klp .nd-images .nm-tx i { font-size:11px; color:var(--muted); font-style:normal; white-space:normal; line-height:1.5; margin-top:3px; max-width:178px; }
.klp .btn-blue,.klp .btn-w,.klp .nav-right .btn-w { background:var(--home-action); color:var(--home-on-action); border-color:var(--home-action); border-radius:9px; box-shadow:var(--sh-cta); }
.klp .btn-blue:hover,.klp .btn-w:hover,.klp .nav-right .btn-w:hover { background:var(--home-action); border-color:var(--home-action); color:var(--home-on-action); box-shadow:0 7px 22px #1766d326; filter:brightness(1.06); }
.klp .btn-w::before { display:none; }
.klp .hero { padding-top:48px; padding-bottom:0; }
.klp .hero>.glow { display:none; }
.klp .home-intro { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(300px,.85fr); align-items:end; gap:50px; margin-bottom:34px; }
.klp .home-intro-copy { max-width:none; }
.klp .home-eyebrow { color:var(--muted); font-size:10px; font-weight:650; letter-spacing:1.6px; margin-bottom:19px; }
.klp .home-title { max-width:900px; font-size:clamp(44px,4.45vw,70px); letter-spacing:-.055em; font-weight:540; line-height:1.07; text-wrap:balance; }
.klp .home-title em { color:var(--blue); font-style:normal; }
.klp .home-intro-side { max-width:415px; padding-bottom:3px; }
.klp .home-intro-side p { font-size:16px; line-height:1.75; color:var(--muted); margin-bottom:21px; }
.klp .home-intro-side .btn { min-height:49px; gap:22px; padding:13px 21px; }
.klp #samples .${gallery.sectionTop} { margin-bottom:14px; }
.klp #samples .${gallery.eyebrow} { color:var(--muted); font-size:10px; letter-spacing:1.5px; }
.klp #samples .${gallery.quietButton} { color:var(--muted); }
.klp #samples .${gallery.featuredFour} { --film-height:clamp(320px,27vw,440px); grid-template-columns:repeat(4,minmax(0,1fr)); height:var(--film-height); gap:18px; }
.klp #samples .${gallery.lead},.klp #samples .${gallery.featureCard} { border-color:var(--line); border-radius:16px; aspect-ratio:auto; grid-column:auto; grid-row:auto; }
.klp #samples .${gallery.lead}:hover,.klp #samples .${gallery.featureCard}:hover { border-color:var(--blue); }
.klp #samples .${gallery.dialog} { background:var(--card); color:var(--txt); border-color:var(--line); }
.klp #samples .${gallery.previewInfo} p { color:var(--muted); }
.klp .home-create { padding-top:30px; }
.klp .home-start { background:var(--card); border-color:var(--line); border-radius:14px; padding:27px 30px; box-shadow:var(--sh-card); }
.klp .home-start h2 { font-size:25px; font-weight:570; }
.klp .home-create-grid { gap:18px; margin-top:18px; }
.klp .home-create-card { background:transparent; border-radius:12px; padding:24px; }
.klp .home-create-icon { background:var(--card); border:1px solid var(--line); color:var(--blue); }
.klp .home-catalog-heading { padding-top:32px; }
.klp .home-catalog-heading h2 { font-size:27px; font-weight:550; }
.klp .step,.klp .tcard { background:var(--card); box-shadow:var(--sh-card); }
.klp .step::before { color:var(--blue-soft); }
.klp .sv:not(.sv3) { background:var(--card2); }
.klp .sv2 i { background:linear-gradient(90deg,var(--blue-soft),var(--line)); }
.klp .gtxt { background:none; -webkit-text-fill-color:currentColor; color:var(--txt); }
.klp .home-proof .home-review p { color:var(--muted)!important; }
.klp .tile { --txt:#eef5fe; --muted2:#b3c5d9; --blue:#91c9ff; background:#152335; }
.klp .tile .tb { color:#b0d9ff; background:#152b45d9; }
.klp .plan.pop { background:var(--card); border-color:var(--home-action); box-shadow:0 0 0 1px var(--home-action),var(--sh-card); }
.klp .plan.pop .pt { background:var(--home-action); color:var(--home-on-action); box-shadow:none; }
.klp .cmp th,.klp .cmp td { border-bottom-color:var(--line); }
.klp .qa summary::after { color:var(--blue); }
.klp .home-pricing-checkout-error { color:var(--error,#bb2846); }
.klp a:focus-visible,.klp button:focus-visible,.klp summary:focus-visible { outline:2px solid var(--blue); outline-offset:4px; }
.klp .nav-mobile-menu a.btn,.klp .nav-mobile-menu a.btn:hover { color:var(--home-on-action); }
.klp .nav-mobile-menu .nav-mobile-engines { display:grid; grid-template-columns:1fr 1fr; gap:4px 10px; padding:4px 0 12px; }
.klp .nav-mobile-menu .nav-mobile-engines a { gap:9px; font-size:12px; border:0; }
.klp .nav-mobile-engines .nm-ic { width:27px; height:27px; border-radius:7px; font-size:10px; }
@media(max-width:1390px) { .klp .nav-in { gap:22px; } .klp .nav-links { gap:23px; } .klp .nav-right { gap:9px; } }
@media(max-width:1200px) {
  .klp .nav-in { display:flex; justify-content:space-between; height:78px; }
  .klp .nav-right { margin-inline-start:auto; }
  .klp .nav-mobile-menu { top:78px; max-height:calc(100dvh - 78px); }
  .klp .home-intro { grid-template-columns:1.3fr 1fr; gap:32px; }
  .klp .home-title { font-size:52px; }
  .klp .home-intro-side p { font-size:14px; }
}
@media(max-width:800px) {
  .klp .wrap,.klp .ew-wrap { padding-inline:24px; }
  .klp .hero { padding-top:34px; }
  .klp .home-intro { grid-template-columns:1fr; gap:22px; }
  .klp .home-title { font-size:49px; }
  .klp .home-intro-side { display:flex; align-items:center; gap:28px; max-width:none; }
  .klp .home-intro-side p { margin-bottom:0; flex:1; }
  .klp #samples .${gallery.featuredFour} { height:auto; grid-template-columns:repeat(2,minmax(0,1fr)); grid-template-rows:auto; gap:14px; }
  .klp #samples .${gallery.lead},.klp #samples .${gallery.featureCard} { height:clamp(240px,48vw,355px); }
}
@media(max-width:560px) {
  .klp .wrap,.klp .ew-wrap { padding-inline:18px; }
  .klp .nav-in { height:72px; gap:9px; }
  .klp .logo { font-size:21px; gap:6px; }
  .klp .logo .mk { width:23px; height:27px; }
  .klp .nav-right { gap:6px; }
  .klp .nav-right>.btn { display:none; }
  .klp .nav-right .kineo-interface-language { width:86px!important; max-width:86px!important; padding-inline:7px!important; font-size:11px!important; }
  .klp .nav-cta { display:none; }
  .klp .nav-mobile-menu { top:72px; max-height:calc(100dvh - 72px); padding-inline:18px; }
  .klp .home-title { font-size:40px; letter-spacing:-.045em; }
  .klp .home-intro { margin-bottom:28px; gap:19px; }
  .klp .home-intro-side { display:block; }
  .klp .home-intro-side p { margin-bottom:18px; font-size:14px; }
  .klp #samples .${gallery.featuredFour} { gap:12px; }
  .klp #samples .${gallery.lead},.klp #samples .${gallery.featureCard} { height:clamp(225px,66vw,320px); border-radius:12px; }
  .klp .home-start { padding:22px; }
  .klp .home-start h2 { font-size:22px; }
  .klp .home-create { padding-top:24px; }
  .klp .home-create-card { padding:20px; }
}
`
