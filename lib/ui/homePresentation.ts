/** Presentation only. Video curation, offers, checkout and tracking stay in KineoLanding. */
export const HOME_PRESENTATION_CSS = `
.klp { --line:rgba(255,255,255,.1); --card:#12151b; --card2:#191d25; --muted:#a8b0bd; }
.klp .hero { padding-top:40px; }
.klp .home-intro { display:flex; align-items:flex-end; justify-content:space-between; gap:32px; margin:0 0 28px; }
.klp .home-intro-copy { max-width:760px; }
.klp .home-eyebrow { margin:0 0 12px; color:#96baff; font-size:12px; line-height:1.5; letter-spacing:.08em; text-transform:uppercase; }
.klp .home-title { margin:0; max-width:750px; font-size:clamp(30px,3.5vw,52px); line-height:1.12; letter-spacing:-.045em; font-weight:650; text-wrap:balance; }
.klp .hero-line { margin:16px 0 0; max-width:660px; text-align:left; font-size:15px; line-height:1.65; color:var(--muted); }
.klp .home-jump { display:flex; flex-wrap:wrap; gap:8px; flex-shrink:0; }
.klp .home-jump a { display:inline-flex; padding:11px 16px; border:1px solid var(--line); border-radius:10px; font-size:13px; color:#d9e0eb; text-decoration:none; background:rgba(255,255,255,.035); }
.klp .home-jump a:hover { border-color:#699cec; background:rgba(68,125,218,.12); }
.klp section { scroll-margin-top:88px; }
.klp .sec-h { max-width:880px; margin-left:auto; margin-right:auto; margin-bottom:32px; }
.klp .sec-h h2 { font-size:clamp(26px,3vw,40px); line-height:1.18; letter-spacing:-.035em; text-wrap:balance; }
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
 .klp .home-eyebrow { font-size:10px; }
 .klp .hero-line { font-size:13px; line-height:1.65; }
 .klp .home-jump { gap:6px; }
 .klp .home-jump a { padding:10px 12px; font-size:12px; }
 .klp .qa summary { padding:18px 2px; }
 .klp .qa summary h3 { font-size:14px; }
 .klp .tcard { padding:20px; }
}
`
