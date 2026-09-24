/** Presentation only. Video curation, offers, checkout and tracking stay in KineoLanding. */
export const HOME_PRESENTATION_CSS = `
.klp { --line:rgba(255,255,255,.1); --card:#12151b; --card2:#191d25; --muted:#a8b0bd; }
.klp .hero { padding-top:40px; padding-bottom:0; }
.klp .home-intro { display:flex; align-items:flex-end; justify-content:space-between; gap:32px; margin:0 0 28px; }
.klp .home-intro-copy { max-width:760px; }
.klp .home-eyebrow { margin:0 0 12px; color:#96baff; font-size:12px; line-height:1.5; letter-spacing:.01em; text-transform:none; font-weight:var(--type-label-weight); }
.klp .home-title { margin:0; max-width:750px; font-size:clamp(30px,3.5vw,48px); line-height:1.15; letter-spacing:-.025em; font-weight:var(--type-title-weight); text-wrap:balance; }
.klp .hero-line { margin:16px 0 0; max-width:660px; text-align:left; font-size:16px; line-height:1.7; color:var(--muted); font-weight:400; }
.klp .nav-right .kineo-interface-language { flex-shrink:0; }
.klp section { scroll-margin-top:88px; }
.klp .sec-h { max-width:880px; margin-left:auto; margin-right:auto; margin-bottom:32px; }
.klp .sec-h h2 { font-size:clamp(26px,3vw,40px); line-height:1.2; letter-spacing:-.025em; text-wrap:balance; font-weight:var(--type-title-weight); }
.klp .ftr h3,.klp .bento .promo h3 { text-transform:none; letter-spacing:0; font-weight:var(--type-label-weight); }
.klp .sec-h p { color:var(--muted); line-height:1.7; max-width:670px; margin-left:auto; margin-right:auto; }
.klp .step,.klp .tcard { box-shadow:none; border:1px solid var(--line); background:linear-gradient(145deg,#171b22,#111419); border-radius:16px; }
.klp .step p,.klp .tcard p { line-height:1.7; color:var(--muted); }
.klp .tcard { padding:24px; }
.klp .tcard:hover { border-color:rgba(120,163,228,.45); }
.klp .tools { gap:16px; }
.klp .cmp { border-radius:16px; box-shadow:none; }
.klp .founder { max-width:860px; margin-left:auto; margin-right:auto; }
.klp .faq { display:flex; flex-direction:column; align-items:stretch; width:100%; max-width:960px; gap:0; border-top:1px solid var(--line); }
.klp details.qa { width:100%; text-align:left; padding:0; background:transparent; border:0; border-bottom:1px solid var(--line); border-radius:0; box-shadow:none; }
.klp .qa summary { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:22px 4px; list-style:none; cursor:pointer; }
.klp .qa summary::-webkit-details-marker { display:none; }
.klp .qa summary::after { content:'+'; color:#96baff; font-size:23px; font-weight:400; flex-shrink:0; }
.klp .qa[open] summary::after { content:'−'; }
.klp .qa summary h3 { margin:0; font-size:16px; font-weight:550; line-height:1.5; }
.klp .qa p { max-width:810px; padding:0 4px 24px; margin:0; color:var(--muted); font-size:14px; line-height:1.85; }
.klp a:focus-visible,.klp summary:focus-visible { outline:2px solid #96baff; outline-offset:5px; border-radius:6px; }
.klp .nd:focus-within .nd-menu { opacity:1; visibility:visible; pointer-events:auto; transform:translateY(0); }
@media(max-width:900px) { .klp .home-intro { flex-direction:column; align-items:flex-start; gap:20px; } }
@media(max-width:560px) {
 .klp .hero { padding-top:24px; }
 .klp .home-intro { margin-bottom:22px; }
 .klp .home-title { font-size:32px; }
 .klp .home-eyebrow { font-size:12px; }
 .klp .hero-line { font-size:15px; line-height:1.7; }
 .klp .nav-right,.klp .nav-cta { gap:6px; }
 .klp .nav-right > .btn { padding:10px 12px !important; font-size:12px !important; white-space:nowrap; }
 /* Dashboard remains in the mobile menu; keep language and balance visible. */
 .klp .nav-cta .nav-dashboard { display:none; }
 .klp .nav-cta > a:not(.nav-dashboard) { padding:8px !important; font-size:11px !important; }
 .klp .nav-in { gap:8px; }
 .klp .qa summary { padding:18px 2px; }
 .klp .qa summary h3 { font-size:14px; }
 .klp .tcard { padding:20px; }
}
@media(max-width:400px) { .klp .nav-in { padding-inline:12px; } }
@media(max-width:350px) { .klp .nav-right > .btn { padding:8px !important; font-size:11px !important; } .klp .nav-right .kineo-interface-language { max-width:80px !important; } }

/* Approved 22 Sep: original blue actions, mint confined to the brand mark. */
.klp .wrap,.klp .ew-wrap { max-width:1680px; }
.klp .plan { min-width:0; overflow-wrap:anywhere; }
.klp .logo .mk { border-color:rgba(171,237,201,.32); box-shadow:0 0 16px rgba(171,237,201,.12); }
.klp .home-intro { position:relative; z-index:1; margin-bottom:26px; }
.klp .home-title { max-width:780px; font-size:clamp(28px,3.1vw,46px); line-height:1.17; }
.klp .home-eyebrow { color:var(--blue); font-size:11px; letter-spacing:.16em; text-transform:uppercase; margin-bottom:10px; }
.klp .btn-blue,.klp .nav-right .btn-w { background:var(--blue); color:#071525; border-color:var(--blue); box-shadow:0 6px 22px -12px rgba(41,151,255,.55); }
.klp .btn-blue:hover,.klp .nav-right .btn-w:hover { background:#63b3ff; border-color:#63b3ff; box-shadow:0 8px 24px -12px rgba(41,151,255,.6); }
.klp .btn-blue { border-radius:12px; font-size:14px; padding:13px 22px; flex-shrink:0; }
.klp .btn-blue:active { transform:scale(.98); }
.klp .hero-ftr { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; overflow:visible; padding-bottom:0; }
.klp .hero-ftr .ftr { width:auto; min-width:0; }
.klp .hero-ftr::after { display:none; }
.klp .hero-ftr .ftr-media { border-radius:16px; }
.klp .hero-ftr .ftr h3 { font-size:14px; margin-top:12px; }
.klp .hero-ftr .ftr p { line-height:1.5; color:var(--muted); }
.klp .home-create { padding:30px 0 0; }
.klp .home-start { display:flex; align-items:center; justify-content:space-between; gap:28px; padding:26px 28px; border:1px solid rgba(41,151,255,.25); border-radius:18px; background:linear-gradient(115deg,rgba(41,151,255,.12),rgba(41,151,255,.025)),var(--card); }
.klp .home-start h2 { font-size:clamp(21px,2vw,27px); line-height:1.25; letter-spacing:-.025em; font-weight:var(--type-title-weight,600); }
.klp .home-start p { max-width:760px; margin-top:8px; color:var(--muted); font-size:14px; line-height:1.6; }
.klp .home-create-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:16px; }
.klp .home-create-card { display:grid; grid-template-columns:40px minmax(0,1fr) 20px; column-gap:15px; align-items:center; padding:24px; border:1px solid var(--line); border-radius:16px; background:var(--card); transition:background 150ms ease,border-color 150ms ease; }
.klp .home-create-card:hover { border-color:rgba(41,151,255,.5); background:var(--card2); }
.klp .home-create-icon { grid-row:span 2; display:grid; place-items:center; width:40px; height:40px; border-radius:11px; background:var(--blue-soft); color:var(--blue); }
.klp .home-create-card h3 { font-size:16px; font-weight:600; }
.klp .home-create-card p { grid-column:2; color:var(--muted); font-size:12px; line-height:1.5; margin-top:4px; }
.klp .home-create-arrow { color:var(--blue); grid-column:3; grid-row:1 / span 2; }
.klp .home-proof { padding:28px 0; }
.klp .home-proof .wrap { display:flex; flex-direction:column; align-items:center; gap:16px; }
.klp .home-proof .proofline { order:0; margin:0; padding:0; }
.klp .home-proof .home-review { order:1; margin:0 auto !important; }
.klp .home-proof .wrap > a { order:2; margin:0 !important; background:transparent !important; border-color:var(--line) !important; color:var(--muted) !important; font-size:12px !important; font-weight:500 !important; }
.klp .home-engines { padding:12px 0 34px; }
.klp .home-catalog-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:18px; padding-top:25px; border-top:1px solid var(--line); }
.klp .home-catalog-heading h2 { font-size:23px; font-weight:600; letter-spacing:-.02em; }
.klp .home-catalog-heading a { color:var(--blue); font-size:13px; }
.klp .home-engines .bento { grid-template-columns:repeat(3,minmax(0,1fr)); grid-auto-rows:minmax(175px,auto); gap:16px; margin:0; }
.klp .home-engines .tile { padding:20px; }
@media(max-width:1000px) {
 .klp .hero-ftr { gap:14px; }
 .klp .home-create-card { padding:20px 16px; column-gap:10px; }
}
@media(max-width:700px) {
 .klp .home-intro { flex-direction:column; align-items:flex-start; gap:18px; }
 .klp .hero-ftr { grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px 12px; }
 .klp .hero-ftr .ftr h3 { font-size:13px; }
 .klp .home-start { flex-direction:column; align-items:flex-start; gap:18px; padding:22px; }
 .klp .home-create-grid { grid-template-columns:1fr; gap:10px; }
 .klp .home-create-card { padding:18px 20px; }
 .klp .home-engines .bento { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
}
@media(max-width:560px) {
 .klp .wrap,.klp .ew-wrap { padding-inline:18px; }
 .klp .hero { padding-top:25px; }
 .klp .home-title { font-size:30px; }
 .klp .home-intro { margin-bottom:25px; }
 .klp .home-intro .btn-blue { padding:12px 18px; }
 .klp .home-create { padding-top:25px; }
 .klp .home-start p { font-size:13px; }
 .klp .home-proof { padding:24px 0; }
 .klp .home-engines .tile { padding:15px; }
 .klp .home-engines .tile h3 { font-size:14px; }
 .klp .home-catalog-heading a { max-width:50%; text-align:end; }
}
@media(max-width:380px) {
 .klp .nav-in { padding-inline:10px; gap:6px; }
 .klp .logo { gap:6px; font-size:16px; }
 .klp .logo .mk { width:24px; height:26px; }
 .klp .nav-right { gap:5px; }
 .klp .nav-right .kineo-interface-language { max-width:78px !important; }
 .klp .home-engines .bento { grid-template-columns:1fr; }
}
@media(min-width:901px) {
 .klp .hero { padding-top:28px; }
 .klp .home-intro { margin-bottom:20px; }
 .klp .home-title { font-size:clamp(30px,3.1vw,42px); }
}
`
