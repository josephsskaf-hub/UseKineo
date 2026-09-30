// Presentation only. Both affiliate surfaces inherit the site's active palette.
export const AFFILIATE_PRESENTATION_CSS = `
.partners-page{min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font-sans),Arial,sans-serif}
.partners-page *, .affiliate-workspace *{box-sizing:border-box}
.partners-container{max-width:1120px;margin:0 auto;padding:28px 28px 72px}
.partners-brand{display:inline-flex;align-items:center;gap:9px;color:var(--text);font-size:18px;font-weight:650;text-decoration:none}
.partners-hero{max-width:800px;margin:52px auto 0;text-align:center}
.partners-page h1{letter-spacing:-.035em;text-wrap:balance}
.partners-page h2{letter-spacing:-.025em;text-wrap:balance}
.partners-grid{gap:16px!important}
.partners-campaigns{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.partners-card{box-shadow:var(--sh-card)}
.partners-primary{display:inline-flex;align-items:center;justify-content:center;min-height:48px;box-shadow:var(--sh-cta);transition:filter .16s,box-shadow .16s}
.partners-primary:hover{filter:brightness(.95);box-shadow:var(--sh-card-h)}
.partners-page a:focus-visible,.partners-table:focus-visible,.affiliate-workspace :is(a,button,input,textarea):focus-visible{outline:2px solid var(--accent);outline-offset:4px}
.partners-table{box-shadow:var(--sh-card)}
.partners-page .kineo-footer .footer-group{background:var(--card);border-color:var(--border)}
.partners-page .kineo-footer .footer-group summary{color:var(--text)}
.partners-page .kineo-footer .footer-group summary:after{color:var(--muted)}
.partners-page .kineo-footer a:hover{color:var(--accent)!important}
.partners-table th,.partners-table td{padding:18px 16px!important}
.partners-page section+section{margin-top:56px!important}
.affiliate-workspace{width:100%;max-width:1120px;margin:0 auto;color:var(--text)}
.affiliate-workspace .font-black,.affiliate-workspace .font-extrabold{font-weight:650}
.affiliate-workspace>.text-center{max-width:700px;margin-inline:auto;padding:44px 32px;box-shadow:var(--sh-card)}
.affiliate-workspace :is(button,a.rounded-xl){min-height:44px;border-radius:11px;transition:filter .16s}
.affiliate-workspace button:enabled:hover,.affiliate-workspace a.rounded-xl:hover{filter:brightness(.96)}
.affiliate-workspace input,.affiliate-workspace textarea{min-width:0;font-size:14px;line-height:1.6}
.affiliate-workspace input:focus-visible,.affiliate-workspace textarea:focus-visible{outline:2px solid var(--accent)!important;outline-offset:3px}
.affiliate-workspace .rounded-2xl{box-shadow:var(--sh-card)}
.affiliate-workspace table{font-variant-numeric:tabular-nums}
.affiliate-workspace th,.affiliate-workspace td{padding:14px 12px}
@media(max-width:640px){
 .partners-container{padding:22px 20px 48px}
 .partners-hero{margin-top:36px}
 .partners-page section+section{margin-top:40px!important}
 .partners-grid{grid-template-columns:minmax(0,1fr)!important;gap:12px!important}
 .partners-page h1{font-size:30px!important;line-height:1.15!important}
 .partners-primary{width:100%;max-width:360px;padding-inline:18px!important;font-size:15px!important}
 .partners-table th,.partners-table td{padding:14px 12px!important}
 .affiliate-workspace>.text-center{padding:32px 22px}
 .affiliate-workspace>.text-center a.rounded-xl{display:flex;align-items:center;justify-content:center;width:100%;padding-inline:12px}
}
@media(prefers-reduced-motion:reduce){.partners-primary,.affiliate-workspace :is(button,a){transition:none}}
`
