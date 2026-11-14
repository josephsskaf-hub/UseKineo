// Presentation only: Joseph approved option A on 13/11. CEO review precedes any public activation.
// /pricing-preview demonstrates the same client with this layout without opening /pricing to it.
export const WATCH_PRICING_PUBLIC = false

// Scoped presentation CSS; the public layout emits none while the flag is closed.
export const WATCH_PRICING_CSS = `.pricing-watch{--bg:#101113;--card:#191c20;--card2:#20242a;--text:#f7f6f2;--text2:#e2e4e7;--muted:#c7ced6;--muted2:#adb6c1;--indigo:#e2f77a;--accent:#e2f77a;--on-accent:#141909;--accent-soft:#29311c;--border:#41464d;--border2:#59626e;color-scheme:dark;font-family:var(--font-sans,'Manrope',Arial,sans-serif)}
.pricing-watch>section{padding-top:24px!important}
.pricing-watch .pricing-intro{margin-bottom:20px!important}
.pricing-watch .pricing-intro h1{font-size:clamp(28px,3.4vw,40px);line-height:1.15;font-weight:700;letter-spacing:-.035em}
.pricing-watch .pricing-intro>.pricing-watch-guarantee{margin-top:14px;gap:7px;font-size:13px;line-height:1.5}
.pricing-watch .pv-stage{--pv-accent:var(--accent);--pv-chip-text:var(--accent);--pv-pop-line:var(--accent);--pv-cta-pop-bg:var(--accent);--pv-cta-pop-text:var(--on-accent);margin-top:0}
.pricing-watch .pv-grid{align-items:start;gap:18px!important}
.pricing-watch #plans>.pv-compact{padding:24px!important;border-radius:18px!important;gap:16px;cursor:pointer;overflow:hidden}
.pricing-watch .pv-compact-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}
.pricing-watch .pv-compact-heading h2{margin:0;font-size:21px;font-weight:750;line-height:1.2;letter-spacing:-.025em}
.pricing-watch .pv-compact-price .pv-price{display:flex!important;align-items:baseline;flex-wrap:wrap;gap:7px}
.pricing-watch .pv-compact-price .pv-amount{font-size:44px}
.pricing-watch .pv-compact-price .pv-per{display:block;margin:5px 0 0;font-size:13px;line-height:1.45}
.pricing-watch .pv-compact-price .pv-note{margin-top:7px;line-height:1.5}
.pricing-watch .pv-compact .pv-credits{margin:0;font-size:15px}
.pricing-watch .pv-compact .pv-films{margin:0;padding:16px 14px}
.pricing-watch .pv-compact .pv-films-main{font-size:16px;line-height:1.4}
.pricing-watch .pv-compact .pv-films-n{font-size:30px}
.pricing-watch .pv-compact .pv-cta{margin:0;min-height:48px}
.pricing-watch .pv-compact-details{border-top:1px solid var(--pv-line);font-size:13px;line-height:1.6}
.pricing-watch .pv-compact-details>summary{display:list-item;min-height:44px;padding-top:13px;cursor:pointer;color:var(--pv-text);font-size:13px;font-weight:650}
.pricing-watch .pv-compact-details .pv-sec{padding:12px 0 0;margin-top:10px}
.pricing-watch .pv-compact-details .pv-inc{font-size:13px}
.pricing-watch .pricing-watch-availability{margin:24px auto;max-width:48rem;font-size:13px}
.pricing-watch .pricing-watch-availability>summary{cursor:pointer;min-height:44px;padding:12px 0;font-weight:650}
.pricing-watch .pricing-watch-teams{margin:40px auto;max-width:64rem;scroll-margin-top:80px}
.pricing-watch .pricing-watch-teams>h2{font-size:24px;font-weight:700;letter-spacing:-.025em}
.pricing-watch .pricing-watch-footer-note{max-width:54rem;margin:20px auto;padding:0 20px;font-size:12px;line-height:1.6;text-align:center;color:var(--muted)}
.pricing-watch .pricing-watch-proof{margin:28px auto;max-width:48rem}
.pricing-watch .pricing-watch-proof figure{margin-top:16px}
.pricing-watch :is(button,a,summary):focus-visible{outline:3px solid var(--accent);outline-offset:3px}
@media(max-width:767px){.pricing-watch>section{padding-top:18px!important}.pricing-watch .pricing-intro{margin-bottom:16px!important}.pricing-watch .pricing-intro h1{font-size:28px}.pricing-watch .pricing-intro>.pricing-watch-guarantee{margin-top:12px}.pricing-watch .pv-grid{gap:18px!important}.pricing-watch #plans>.pv-compact{padding:20px!important;gap:13px}.pricing-watch .pv-compact-price .pv-amount{font-size:40px}.pricing-watch .pv-compact .pv-films{padding:12px 14px}.pricing-watch .pv-compact-heading h2{font-size:20px}}
`
